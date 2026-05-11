import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPost, createPost, updatePost, deletePost,
  getPostMedia, linkPostVideo, deletePostMedia,
  PostMediaWithFiles,
} from './post-api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaUpload } from '../components/MediaUpload';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';
import { extractVideoFrame } from '../utils/extractVideoFrame';
import { uploadData } from 'aws-amplify/storage';

interface MediaSlot {
  id?: string;
  videoFileKey: string;
  posterFileKey: string;
  autoPosterKey: string | null;
  generatingPoster: boolean;
  existingVideoKey: string | null;
  existingPosterKey: string | null;
  existingVideoMediaID?: string;
  existingPosterMediaID?: string;
}

function emptySlot(): MediaSlot {
  return { videoFileKey: '', posterFileKey: '', autoPosterKey: null, generatingPoster: false, existingVideoKey: null, existingPosterKey: null };
}

export function PostForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navigate: guardedNavigate, setDirty } = useNavigationGuard();
  const isNew = id === 'new' || !id;

  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [mediaSlots, setMediaSlots] = useState<MediaSlot[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(
    isNew ? { content: '', isPublished: false, mediaSlots: [] } : null,
  );
  const isDirty = useFormDirtyTracking(initialValues, { content, isPublished, mediaSlots });

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([getPost(id), getPostMedia(id)]).then(([post, media]) => {
        if (post) {
          setContent(post.content);
          setIsPublished(post.isPublished);
          setPublishedAt(post.publishedAt);
        }
        const slots: MediaSlot[] = media.map((pm: PostMediaWithFiles) => ({
          id: pm.id,
          videoFileKey: '',
          posterFileKey: '',
          autoPosterKey: null,
          generatingPoster: false,
          existingVideoKey: pm.videoMedia.fileKey,
          existingPosterKey: pm.posterMedia.fileKey,
          existingVideoMediaID: pm.videoMedia.id,
          existingPosterMediaID: pm.posterMedia.id,
        }));
        setMediaSlots(slots);
        setInitialValues({
          content: post?.content ?? '',
          isPublished: post?.isPublished ?? false,
          mediaSlots: slots,
        });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  function addMediaSlot() {
    if (mediaSlots.length >= 3) return;
    setMediaSlots((prev) => [...prev, emptySlot()]);
  }

  function removeMediaSlot(index: number) {
    setMediaSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSlotVideoUpload(index: number, key: string, file?: File) {
    setMediaSlots((prev) => prev.map((s, i) => (i === index ? { ...s, videoFileKey: key } : s)));

    // Auto-generate poster from first frame if no manual poster exists
    if (file && key) {
      const slot = mediaSlots[index];
      if (!slot.posterFileKey && !slot.existingPosterKey) {
        setMediaSlots((prev) => prev.map((s, i) => (i === index ? { ...s, generatingPoster: true } : s)));
        try {
          const posterBlob = await extractVideoFrame(file);
          const posterFileName = file.name.replace(/\.[^.]+$/, '_poster.jpg');
          const posterKey = `post_poster/${posterFileName}`;
          await uploadData({ path: posterKey, data: posterBlob });
          setMediaSlots((prev) => prev.map((s, i) =>
            i === index && !s.posterFileKey ? { ...s, autoPosterKey: posterKey, generatingPoster: false } : i === index ? { ...s, generatingPoster: false } : s,
          ));
        } catch {
          console.warn('Kunde inte auto-generera poster-bild');
          setMediaSlots((prev) => prev.map((s, i) => (i === index ? { ...s, generatingPoster: false } : s)));
        }
      }
    }
  }

  function updateSlotPoster(index: number, key: string) {
    setMediaSlots((prev) => prev.map((s, i) => (i === index ? { ...s, posterFileKey: key } : s)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let postID = id!;

      if (isNew) {
        const created = await createPost({
          content,
          publishedAt: isPublished ? now : now,
          isPublished,
        });
        postID = created.id;
      } else {
        await updatePost({
          id: postID,
          content,
          isPublished,
          ...(isPublished && !publishedAt ? { publishedAt: now } : {}),
        });

        // Delete existing media that are no longer in slots
        const existingMedia = await getPostMedia(postID);
        const keepIds = new Set(mediaSlots.filter((s) => s.id).map((s) => s.id));
        for (const pm of existingMedia) {
          if (!keepIds.has(pm.id)) {
            await deletePostMedia(pm.id, pm.videoMedia.id, pm.posterMedia.id);
          }
        }
      }

      // Create new media links for slots that have new uploads
      for (let i = 0; i < mediaSlots.length; i++) {
        const slot = mediaSlots[i];
        const effectivePosterKey = slot.posterFileKey || slot.autoPosterKey;
        if (slot.videoFileKey && effectivePosterKey) {
          // New upload — delete old if replacing
          if (slot.id && slot.existingVideoMediaID && slot.existingPosterMediaID) {
            await deletePostMedia(slot.id, slot.existingVideoMediaID, slot.existingPosterMediaID);
          }
          await linkPostVideo(postID, slot.videoFileKey, effectivePosterKey, i);
        }
      }

      setDirty(false);
      navigate('/admin/posts');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    await deletePost(id);
    navigate('/admin/posts');
  }

  if (loading) return <p className="text-stone-400">Laddar...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">{isNew ? 'Nytt inlägg' : 'Redigera inlägg'}</h2>
      <div className="w-12 h-0.5 bg-[#F24E1E] mb-8 rounded-full" />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-base font-medium text-stone-200 mb-1.5">Innehåll</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors resize-y"
          />
        </div>

        {/* Publish toggle */}
        <div className="border-t border-stone-700/50 pt-6">
          <h3 className="text-base font-medium text-stone-200 mb-4">Publicering</h3>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              onClick={() => setIsPublished((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublished ? 'bg-[#F24E1E]' : 'bg-stone-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isPublished ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-stone-300">Publicera direkt</span>
          </label>
          <p className="text-xs text-stone-500 mt-2">
            {isPublished ? 'Inlägget publiceras och blir synligt för prenumeranter' : 'Sparas som utkast — ej synligt för prenumeranter'}
          </p>
          {!isNew && publishedAt && isPublished && (
            <p className="text-xs text-stone-600 mt-1">
              Publicerad: {new Date(publishedAt).toLocaleDateString('sv-SE')}{' '}
              {new Date(publishedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Media section */}
        <div className="border-t border-stone-700/50 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-stone-200">Media</h3>
            {mediaSlots.length < 3 && (
              <button
                type="button"
                onClick={addMediaSlot}
                className="text-sm text-[#F24E1E] hover:text-[#d93d0f] font-medium transition-colors"
              >
                + Lägg till video
              </button>
            )}
          </div>

          {mediaSlots.length === 0 && (
            <p className="text-stone-500 text-sm">Inga videor tillagda.</p>
          )}

          <div className="space-y-4">
            {mediaSlots.map((slot, i) => (
              <div key={i} className="bg-stone-800/40 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-stone-200">Video {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeMediaSlot(i)}
                    className="text-stone-500 text-sm hover:text-red-400 transition-colors"
                  >
                    Ta bort
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MediaUpload
                    label="Video (.mp4, .mov, .webm)"
                    accept="video/mp4,video/quicktime,video/webm"
                    fileKeyPrefix="post_media/"
                    onUpload={(key, file) => handleSlotVideoUpload(i, key, file)}
                    existingFileKey={!slot.videoFileKey ? slot.existingVideoKey : null}
                  />
                  <div>
                    <MediaUpload
                      label="Poster-bild"
                      accept="image/*"
                      fileKeyPrefix="post_poster/"
                      onUpload={(key) => updateSlotPoster(i, key)}
                      existingFileKey={!slot.posterFileKey ? (slot.existingPosterKey ?? slot.autoPosterKey) : null}
                    />
                    {slot.generatingPoster && (
                      <p className="text-xs text-stone-400 mt-1">Genererar poster-bild från video...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 border-t border-stone-700/50">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button
            type="button"
            onClick={() => guardedNavigate('/admin/posts')}
            className="px-4 py-2.5 text-sm text-stone-400 hover:text-white rounded-xl transition-colors"
          >
            Avbryt
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 text-sm text-red-400/70 hover:text-red-300 ml-auto transition-colors"
            >
              Ta bort
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Ta bort inlägg?"
        message="Vill du verkligen ta bort detta inlägg? All media raderas också."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
