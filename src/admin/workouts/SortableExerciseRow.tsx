import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface ExerciseRowData {
  clientId: string;
  exerciseName: string;
  sets: string;
  reps: string;
  superset: string;
}

interface SortableExerciseRowProps {
  row: ExerciseRowData;
  activeIndex: number;
  onUpdate: (field: 'sets' | 'reps' | 'superset', value: string) => void;
  onRemove: () => void;
}

export function SortableExerciseRow({ row, activeIndex, onUpdate, onRemove }: SortableExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.clientId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-stone-800 p-2.5 rounded-xl ${isDragging ? 'opacity-30' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Dra för att ändra ordning på ${row.exerciseName}`}
        className="p-1.5 -ml-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-700/50 cursor-grab active:cursor-grabbing transition-colors touch-none focus:outline-none focus-visible:text-[#F24E1E] focus-visible:bg-stone-700/50"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-sm text-white flex-1">
        {activeIndex}. {row.exerciseName}
      </span>
      <input
        value={row.sets}
        onChange={(e) => onUpdate('sets', e.target.value)}
        placeholder="Sets"
        className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600"
      />
      <input
        value={row.reps}
        onChange={(e) => onUpdate('reps', e.target.value)}
        placeholder="Reps"
        className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600"
      />
      <input
        value={row.superset}
        onChange={(e) => onUpdate('superset', e.target.value)}
        placeholder="Superset"
        className="w-20 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Ta bort ${row.exerciseName}`}
        className="text-red-400 text-sm hover:text-red-300 transition-colors"
      >
        &#x2715;
      </button>
    </div>
  );
}

export function ExerciseRowDragOverlay({ row, activeIndex }: { row: ExerciseRowData; activeIndex: number }) {
  return (
    <div className="flex items-center gap-2 bg-stone-800 p-2.5 rounded-xl shadow-2xl border border-[#F24E1E]/60 rotate-1 cursor-grabbing">
      <div className="p-1.5 -ml-1 text-[#F24E1E]">
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-sm text-white flex-1">
        {activeIndex}. {row.exerciseName}
      </span>
      <div className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600">
        {row.sets}
      </div>
      <div className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600">
        {row.reps}
      </div>
      <div className="w-20 px-2 py-1.5 bg-stone-700 text-white text-sm text-center rounded-lg border border-stone-600">
        {row.superset}
      </div>
      <div className="text-red-400 text-sm">&#x2715;</div>
    </div>
  );
}
