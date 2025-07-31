import React from 'react'
import { Button } from '../../../../../components/ui/button'
import { X } from 'lucide-react'

interface Account {
  id: string
  name: string
  avatarUrl: string
}

interface AvatarListProps {
  accounts: Account[]
  activeAccountId: string | null
  setActiveAccount: (id: string) => void
  avatarToDelete: string | null
  setAvatarToDelete: (id: string | null) => void
  deleteAccount: (id: string) => void
}

const AvatarList: React.FC<AvatarListProps> = ({
  accounts,
  activeAccountId,
  setActiveAccount,
  avatarToDelete,
  setAvatarToDelete,
  deleteAccount
}) => (
  <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-1">
    {accounts.slice(0, 10).map((acc) => (
      <div key={acc.id} className="relative">
        <div
          onClick={() => setActiveAccount(acc.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            setAvatarToDelete(acc.id)
          }}
          className={`w-8 h-8 rounded-[8px] cursor-pointer transition-colors bg-center bg-cover flex items-center justify-center text-white ${
            activeAccountId === acc.id
              ? 'ring-2 ring-[#222026] bg-[#4381e2] scale-110'
              : 'bg-[#222026] bg-opacity-80 hover:bg-[#4381e2] hover:bg-opacity-100'
          }`}
          style={{ backgroundImage: `url(${acc.avatarUrl})` }}
        >
          <span className="text-white font-bold z-10">{acc.name.charAt(0)}</span>
        </div>
        {avatarToDelete === acc.id && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 bg-background text-white rounded-full"
            onClick={() => {
              setAvatarToDelete(null)
              deleteAccount(acc.id)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    ))}
  </div>
)

export default AvatarList
