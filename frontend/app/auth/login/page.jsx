'use client';

import { useRouter } from 'next/navigation';
import AuthForm from '../../../components/AuthForm';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async ({ email, password }) => {
    await login(email, password);
    router.push('/');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Log in</h2>
      <AuthForm mode="login" onSubmit={handleSubmit} />
    </div>
  );
}
