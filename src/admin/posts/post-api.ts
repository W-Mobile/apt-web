import { client } from '../amplify-config';

export interface Post {
  id: string;
  content: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  content: string;
  publishedAt: string;
  isPublished: boolean;
}

export interface UpdatePostInput {
  id: string;
  content?: string;
  publishedAt?: string;
  isPublished?: boolean;
}

export interface PostMedia {
  id: string;
  postID: string;
  videoMediaID: string;
  posterMediaID: string;
  sortOrder: number;
}

export interface Media {
  id: string;
  fileKey: string;
  type: string;
}

export interface PostMediaWithFiles {
  id: string;
  postID: string;
  sortOrder: number;
  videoMedia: Media;
  posterMedia: Media;
}

export async function listPosts(): Promise<Post[]> {
  const all: Post[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Post.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Post[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getPost(id: string): Promise<Post | null> {
  const { data } = await client.models.Post.get({ id });
  return data as unknown as Post | null;
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const { data, errors } = await client.models.Post.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Post;
}

export async function updatePost(input: UpdatePostInput): Promise<Post> {
  const { data, errors } = await client.models.Post.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Post;
}

export async function deletePost(id: string): Promise<void> {
  const media = await getPostMedia(id);
  for (const pm of media) {
    await client.models.Media.delete({ id: pm.videoMedia.id });
    await client.models.Media.delete({ id: pm.posterMedia.id });
    await client.models.PostMedia.delete({ id: pm.id });
  }
  const { errors } = await client.models.Post.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function getPostMedia(postID: string): Promise<PostMediaWithFiles[]> {
  const all: PostMedia[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.PostMedia.list({
      filter: { postID: { eq: postID } },
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as PostMedia[]));
    nextToken = newToken ?? null;
  } while (nextToken);

  const result: PostMediaWithFiles[] = [];
  for (const pm of all) {
    const { data: videoData } = await client.models.Media.get({ id: pm.videoMediaID });
    const { data: posterData } = await client.models.Media.get({ id: pm.posterMediaID });
    if (videoData && posterData) {
      result.push({
        id: pm.id,
        postID: pm.postID,
        sortOrder: pm.sortOrder,
        videoMedia: videoData as unknown as Media,
        posterMedia: posterData as unknown as Media,
      });
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function createMedia(fileKey: string, type: 'video' | 'image'): Promise<Media> {
  const { data, errors } = await client.models.Media.create({ fileKey, type });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Media;
}

export async function linkPostVideo(
  postID: string,
  videoFileKey: string,
  posterFileKey: string,
  sortOrder: number,
): Promise<void> {
  const videoMedia = await createMedia(videoFileKey, 'video');
  const posterMedia = await createMedia(posterFileKey, 'image');
  const { errors } = await client.models.PostMedia.create({
    postID,
    videoMediaID: videoMedia.id,
    posterMediaID: posterMedia.id,
    sortOrder,
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function deletePostMedia(id: string, videoMediaID: string, posterMediaID: string): Promise<void> {
  await client.models.Media.delete({ id: videoMediaID });
  await client.models.Media.delete({ id: posterMediaID });
  const { errors } = await client.models.PostMedia.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
