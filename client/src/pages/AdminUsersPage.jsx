import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  useDeactivateUser,
  useRegisterCounsellor,
  useUsers,
} from '../api/users.js';
import { applyFieldErrors, normalizeApiError } from '../api/errors.js';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const schema = z.object({
  name: z.string().min(1, 'Enter a name.'),
  email: z.string().email('Enter a valid email.'),
  password: z
    .string()
    .min(12, 'Use at least 12 characters.')
    .regex(/[a-z]/, 'Include a lowercase letter.')
    .regex(/[A-Z]/, 'Include an uppercase letter.')
    .regex(/[0-9]/, 'Include a number.')
    .regex(/[^A-Za-z0-9]/, 'Include a special character.'),
});

function CreateDialog({ open, onClose }) {
  const form = useForm({ resolver: zodResolver(schema) });
  const register = useRegisterCounsellor();
  const [show, setShow] = useState(false);
  const submit = async (values) => {
    try {
      await register.mutateAsync(values);
      toast.success('Counsellor created.');
      form.reset();
      onClose();
    } catch (error) {
      const normalized = normalizeApiError(error);
      applyFieldErrors(normalized, form.setError);
      toast.error(normalized.message);
    }
  };
  return (
    <Modal open={open} title="Create counsellor" onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <Input
          label="Name"
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <Input
          label="Email"
          type="email"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        <div className="flex items-end gap-2">
          <Input
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShow((value) => !value)}
          >
            {show ? 'Hide' : 'Show'}
          </Button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Minimum 12 characters, with uppercase, lowercase, number, and special
          character.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={register.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState(null);
  const trigger = useRef(null);
  const users = useUsers({ page, limit: 20 });
  const deactivate = useDeactivateUser();
  const confirmDeactivate = async () => {
    try {
      await deactivate.mutateAsync(deactivateId);
      toast.success('User deactivated.');
      setDeactivateId(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };
  const totalPages = Math.max(
    1,
    Math.ceil((users.data?.meta?.total || 0) / 20),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Administration
          </p>
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        <Button ref={trigger} onClick={() => setCreateOpen(true)}>
          Create counsellor
        </Button>
      </div>
      {users.isLoading && <Skeleton className="h-64" />}
      {users.isError && <ErrorState onRetry={() => users.refetch()} />}
      {!users.isLoading && !users.isError && !users.data?.data?.length && (
        <EmptyState title="No users found" />
      )}
      {!!users.data?.data?.length && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.data.map((item) => {
                  const id = item.id || item._id;
                  const self = id === currentUser?.id;
                  return (
                    <tr key={id} className="border-b last:border-0">
                      <td className="p-3">{item.name}</td>
                      <td className="p-3">{item.email}</td>
                      <td className="p-3">{item.role}</td>
                      <td className="p-3">{item.isActive ? 'Yes' : 'No'}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          disabled={!item.isActive || self}
                          title={
                            self ? 'You cannot deactivate yourself.' : undefined
                          }
                          onClick={() => setDeactivateId(id)}
                        >
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </Card>
      )}
      <CreateDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          trigger.current?.focus();
        }}
      />
      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate user"
        onClose={() => setDeactivateId(null)}
        onConfirm={confirmDeactivate}
      >
        Deactivate this user? They will no longer be able to sign in.
      </ConfirmDialog>
    </div>
  );
}
