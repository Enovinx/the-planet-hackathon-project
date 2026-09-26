import { createFileRoute } from '@tanstack/react-router'
import AirlockRoom from '../components/airlockroom'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      <AirlockRoom />
    </main>
  )
}