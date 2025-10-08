import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Tab, Listbox } from '@headlessui/react';
import {
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  CheckIcon,
  ChevronUpDownIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  ClockIcon,
  UserIcon,
  ClockIcon as ActivityIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { closeTaskModal, updateTask, deleteTask, createTask } from '@/features/boards/boardsSlice';
import TaskComments from './TaskComments';
import TaskAttachments from './TaskAttachments';
import ActivityFeed from '../ActivityFeed';

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-600' },
];

const labelColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

interface TaskDetailModalProps {
  columnId?: string; // For creating new task
}

export default function TaskDetailModal({ columnId }: TaskDetailModalProps) {
  const dispatch = useAppDispatch();
  const { isTaskModalOpen, selectedTask, currentBoard } = useAppSelector(
    (state) => state.boards
  );

  const isNewTask = !selectedTask && columnId;
  const isOpen = isTaskModalOpen || !!columnId;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Label input state
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(labelColors[0]);
  const [showLabelInput, setShowLabelInput] = useState(false);

  // Tab state
  const [selectedTab, setSelectedTab] = useState(0);

  // Populate form when editing
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description || '');
      setPriority(selectedTask.priority);
      setDueDate(selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd') : '');
      setLabels(selectedTask.labels.map(l => ({ name: l.name, color: l.color || '#6b7280' })));
      setSelectedTab(0);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setLabels([]);
      setSelectedTab(0);
    }
  }, [selectedTask]);

  const handleClose = () => {
    dispatch(closeTaskModal());
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setLabels([]);
    setShowLabelInput(false);
    setSelectedTab(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      if (selectedTask) {
        await dispatch(updateTask({
          id: selectedTask._id,
          payload: {
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            dueDate: dueDate || null,
          },
        })).unwrap();
      } else if (columnId && currentBoard) {
        await dispatch(createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          boardId: currentBoard._id,
          columnId,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          labels: labels.length > 0 ? labels : undefined,
        })).unwrap();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await dispatch(deleteTask(selectedTask._id)).unwrap();
      handleClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    setLabels([...labels, { name: newLabelName.trim(), color: newLabelColor || '#6b7280' }]);
    setNewLabelName('');
    setShowLabelInput(false);
  };

  const handleRemoveLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isNewTask ? 'Create Task' : selectedTask?.title || 'Task Details'}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    {selectedTask && (
                      <button
                        onClick={handleDelete}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete task"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* Main content */}
                  <div className="flex-1 p-6">
                    {selectedTask ? (
                      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                        <Tab.List className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                          <Tab
                            className={({ selected }) =>
                              clsx(
                                'pb-2 text-sm font-medium border-b-2 -mb-px',
                                selected
                                  ? 'text-primary-600 border-primary-600'
                                  : 'text-gray-500 border-transparent hover:text-gray-700'
                              )
                            }
                          >
                            Details
                          </Tab>
                          <Tab
                            className={({ selected }) =>
                              clsx(
                                'pb-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1',
                                selected
                                  ? 'text-primary-600 border-primary-600'
                                  : 'text-gray-500 border-transparent hover:text-gray-700'
                              )
                            }
                          >
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                            Comments
                            {selectedTask.commentCount > 0 && (
                              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                                {selectedTask.commentCount}
                              </span>
                            )}
                          </Tab>
                          <Tab
                            className={({ selected }) =>
                              clsx(
                                'pb-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1',
                                selected
                                  ? 'text-primary-600 border-primary-600'
                                  : 'text-gray-500 border-transparent hover:text-gray-700'
                              )
                            }
                          >
                            <PaperClipIcon className="w-4 h-4" />
                            Attachments
                            {selectedTask.attachmentCount > 0 && (
                              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                                {selectedTask.attachmentCount}
                              </span>
                            )}
                          </Tab>
                          <Tab
                            className={({ selected }) =>
                              clsx(
                                'pb-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1',
                                selected
                                  ? 'text-primary-600 border-primary-600'
                                  : 'text-gray-500 border-transparent hover:text-gray-700'
                              )
                            }
                          >
                            <ActivityIcon className="w-4 h-4" />
                            Activity
                          </Tab>
                        </Tab.List>

                        <Tab.Panels>
                          {/* Details Tab */}
                          <Tab.Panel>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              {/* Title */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white resize-none"
                                  placeholder="Add a description..."
                                />
                              </div>

                              {/* Labels */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Labels
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {labels.map((label, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm text-white"
                                      style={{ backgroundColor: label.color }}
                                    >
                                      {label.name}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLabel(index)}
                                        className="hover:bg-white/20 rounded-full p-0.5"
                                      >
                                        <XMarkIcon className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                  {!showLabelInput && (
                                    <button
                                      type="button"
                                      onClick={() => setShowLabelInput(true)}
                                      className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-500 hover:border-gray-400"
                                    >
                                      <TagIcon className="w-4 h-4" />
                                      Add
                                    </button>
                                  )}
                                </div>

                                {showLabelInput && (
                                  <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <input
                                      type="text"
                                      value={newLabelName}
                                      onChange={(e) => setNewLabelName(e.target.value)}
                                      placeholder="Label name"
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddLabel();
                                        }
                                      }}
                                    />
                                    <div className="flex gap-1">
                                      {labelColors.slice(0, 6).map((color) => (
                                        <button
                                          key={color}
                                          type="button"
                                          onClick={() => setNewLabelColor(color)}
                                          className={clsx(
                                            'w-5 h-5 rounded-full',
                                            newLabelColor === color && 'ring-2 ring-offset-1 ring-gray-400'
                                          )}
                                          style={{ backgroundColor: color }}
                                        />
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleAddLabel}
                                      className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                                    >
                                      Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowLabelInput(false)}
                                      className="text-xs text-gray-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Submit */}
                              <div className="flex justify-end pt-4">
                                <button
                                  type="submit"
                                  disabled={isSubmitting}
                                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50"
                                >
                                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </form>
                          </Tab.Panel>

                          {/* Comments Tab */}
                          <Tab.Panel>
                            <TaskComments taskId={selectedTask._id} />
                          </Tab.Panel>

                          {/* Attachments Tab */}
                          <Tab.Panel>
                            <TaskAttachments taskId={selectedTask._id} />
                          </Tab.Panel>

                          {/* Activity Tab */}
                          <Tab.Panel>
                            <ActivityFeed taskId={selectedTask._id} limit={30} showTitle={false} compact />
                          </Tab.Panel>
                        </Tab.Panels>
                      </Tab.Group>
                    ) : (
                      // New task form
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                            placeholder="Task title"
                            required
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white resize-none"
                            placeholder="Add a description..."
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50"
                          >
                            {isSubmitting ? 'Creating...' : 'Create Task'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Sidebar (only for existing tasks) */}
                  {selectedTask && (
                    <div className="w-64 p-6 bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-700">
                      <div className="space-y-4">
                        {/* Priority */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Priority
                          </label>
                          <Listbox value={priority} onChange={setPriority}>
                            <div className="relative">
                              <Listbox.Button className="relative w-full py-2 pl-3 pr-8 text-left text-sm border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:ring-2 focus:ring-primary-500 dark:bg-gray-800">
                                <span className={clsx(
                                  'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                                  priorities.find(p => p.value === priority)?.color
                                )}>
                                  {priorities.find(p => p.value === priority)?.label}
                                </span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                                  <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />
                                </span>
                              </Listbox.Button>
                              <Listbox.Options className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                {priorities.map((p) => (
                                  <Listbox.Option
                                    key={p.value}
                                    value={p.value}
                                    className={({ active }) =>
                                      clsx(
                                        'cursor-pointer select-none py-2 pl-8 pr-4 text-sm',
                                        active && 'bg-gray-100 dark:bg-gray-700'
                                      )
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className={clsx(
                                          'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                                          p.color
                                        )}>
                                          {p.label}
                                        </span>
                                        {selected && (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-500">
                                            <CheckIcon className="w-4 h-4" />
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </div>
                          </Listbox>
                        </div>

                        {/* Due Date */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Due Date
                          </label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Assignees */}
                        {selectedTask.assignees && selectedTask.assignees.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Assignees
                            </label>
                            <div className="space-y-2">
                              {selectedTask.assignees.map((assignee) => (
                                <div key={assignee._id} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium">
                                    {assignee.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {assignee.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs text-gray-500">
                          {selectedTask.createdBy && (
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-3.5 h-3.5" />
                              <span>Created by {selectedTask.createdBy.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>
                              Created {format(new Date(selectedTask.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {selectedTask.attachmentCount > 0 && (
                            <div className="flex items-center gap-2">
                              <PaperClipIcon className="w-3.5 h-3.5" />
                              <span>{selectedTask.attachmentCount} attachment(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
