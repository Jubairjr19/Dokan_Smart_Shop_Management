import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

export default function NotFound() {
  return (
    <GlassCard className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        message="The address may be mistyped, or the page may have moved."
        action={
          <Link to="/dashboard" className="font-semibold text-brand-cyan hover:underline">
            Back to Dashboard
          </Link>
        }
      />
    </GlassCard>
  )
}
