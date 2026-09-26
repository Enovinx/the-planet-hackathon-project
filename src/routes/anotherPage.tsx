import { Link, createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useAction } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/anotherPage')({
  component: AnotherPage,
})

function AnotherPage() {
  const callMyAction = useAction(api.myFunctions.myAction)
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)

  const { data } = useSuspenseQuery(
    convexQuery(api.myFunctions.listNumbers, { count: 10 }),
  )

  return (
    <main className="p-8 flex flex-col gap-16">
      <h1 className="text-4xl font-bold text-center">
        Convex + Tanstack Start
      </h1>
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <p>Numbers: {data.numbers.join(', ')}</p>
        <p>Click the button below to add a random number to the database.</p>
        <p>
          <button
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2"
            onClick={() => {
              setActionMessage(null)
              void callMyAction({
                first: Math.round(Math.random() * 100),
              }).then(() => {
                setActionMessage('Action completed: number added!')
              })
            }}
          >
            Call action to add a random number
          </button>
          {actionMessage !== null ? <p>{actionMessage}</p> : null}
        </p>
        <Link to="/" className="text-blue-600 underline hover:no-underline">
          Back
        </Link>
      </div>
    </main>
  )
}
