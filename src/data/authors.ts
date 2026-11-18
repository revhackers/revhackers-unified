export interface Author {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  bio?: string;
  linkedin?: string;
}

export const authors: Record<string, Author> = {
  'giulliano-alves': {
    id: 'giulliano-alves',
    name: 'Giulliano Alves',
    role: 'CEO e fundador',
    avatar: '/uploads/giulliano-avatar-128.png',
    bio: 'Especialista em Growth e Estratégia de Receita B2B. Focado em transformar operações complexas em máquinas de crescimento previsíveis e escaláveis.',
    linkedin: 'https://www.linkedin.com/in/giullianoalves',
  },
  'equipe-revhackers': {
    id: 'equipe-revhackers',
    name: 'Equipe RevHackers',
  },
};
