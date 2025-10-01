import { Fragment, useState } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '@/services/api';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onMemberAdded?: () => void;
}

interface SearchResult {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const roles = [
  { value: 'viewer', label: 'Viewer', description: 'Can view tasks and boards' },
  { value: 'editor', label: 'Editor', description: 'Can create and edit tasks' },
  { value: 'manager', label: 'Manager', description: 'Full access including settings' },
];

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  onMemberAdded,
}: InviteMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError('');

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data.users || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Invite user
  const handleInvite = async () => {
    if (!selectedUser) return;

    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUser._id,
        role: selectedRole?.value || 'viewer',
      });

      setSuccess(`${selectedUser.name} has been added to the project`);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      onMemberAdded?.();

      // Close after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setError('');
    setSuccess('');
    onClose();
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <UserPlusIcon className="w-5 h-5" />
                    Invite Member
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Success message */}
                  {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                      {success}
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Search input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search by name or email
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Search users..."
                      />
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && !selectedUser && (
                      <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user._id}
                            onClick={() => {
                              setSelectedUser(user);
                              setSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {isSearching && (
                      <div className="mt-2 text-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500 mx-auto"></div>
                      </div>
                    )}

                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !selectedUser && (
                      <p className="mt-2 text-sm text-gray-500 text-center py-2">
                        No users found
                      </p>
                    )}
                  </div>

                  {/* Selected user */}
                  {selectedUser && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {selectedUser.name}
                            </p>
                            <p className="text-sm text-gray-500">{selectedUser.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Role selection */}
                  {selectedUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role
                      </label>
                      <Listbox value={selectedRole} onChange={setSelectedRole}>
                        <div className="relative">
                          <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:ring-2 focus:ring-primary-500 dark:bg-gray-800">
                            <span className="block truncate text-gray-900 dark:text-white">
                              {selectedRole?.label || 'Select role'}
                            </span>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                              {roles.map((role) => (
                                <Listbox.Option
                                  key={role.value}
                                  value={role}
                                  className={({ active }) =>
                                    clsx(
                                      'cursor-pointer select-none relative py-2 pl-10 pr-4',
                                      active && 'bg-gray-100 dark:bg-gray-700'
                                    )
                                  }
                                >
                                  {({ selected }) => (
                                    <>
                                      <div>
                                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                          {role.label}
                                        </span>
                                        <span className="block text-xs text-gray-500">
                                          {role.description}
                                        </span>
                                      </div>
                                      {selected && (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500">
                                          <CheckIcon className="w-5 h-5" />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={!selectedUser || isInviting}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInviting ? 'Inviting...' : 'Add Member'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
