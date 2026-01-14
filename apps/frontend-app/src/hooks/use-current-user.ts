import { useEffect, useMemo, useState } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  color: string;
}

const palette = [
  '#2563eb',
  '#db2777',
  '#16a34a',
  '#7c3aed',
  '#f97316',
  '#0ea5e9',
  '#facc15',
];

const randomColor = () => palette[Math.floor(Math.random() * palette.length)];

const generateUser = (): CurrentUser => ({
  id: crypto.randomUUID(),
  name: `Collaborator ${Math.floor(Math.random() * 900 + 100)}`,
  color: randomColor(),
});

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = window.localStorage.getItem('collaboration:user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CurrentUser;
        setUser(parsed);
        return;
      } catch (err) {
        console.warn('Failed to parse cached user', err);
      }
    }
    const generated = generateUser();
    window.localStorage.setItem('collaboration:user', JSON.stringify(generated));
    setUser(generated);
  }, []);

  return useMemo(() => user, [user]);
};
