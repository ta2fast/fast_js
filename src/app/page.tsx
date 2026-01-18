import { redirect } from 'next/navigation';

export default function Home() {
  // トップページは廃止。運営ページにリダイレクト
  redirect('/admin');
}
