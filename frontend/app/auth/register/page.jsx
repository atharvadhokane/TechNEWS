'use client';

import { useRouter } from 'next/navigation';
import AuthForm from '../../../components/AuthForm';
import { api } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const handleSubmit = async ({ email, password, name }) => {
    const data = await api.register(email, password, name);
    window.localStorage.setItem('ai_tech_news_token', data.token);
    router.push('/');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Create an account</h2>
      <AuthForm mode="register" onSubmit={handleSubmit} />
    </div>
  );
}
