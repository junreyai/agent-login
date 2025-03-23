import { redirect } from 'next/navigation'

export default function Home(): JSX.Element {
  redirect('/login')
  return <div></div>
} 