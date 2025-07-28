import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../../components/ui/avatar'
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
        <Avatar
          className={`w-8 h-8 rounded-[8px] cursor-pointer transition-colors ${
            activeAccountId === acc.id
              ? 'bg-primary text-primary-foreground scale-110'
              : 'opacity-80 hover:bg-primary hover:text-primary-foreground'
          }`}
          onClick={() => setActiveAccount(acc.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            setAvatarToDelete(acc.id)
          }}
        >
          <AvatarImage src={acc.avatarUrl} alt={acc.name} />
          <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
        </Avatar>
        {avatarToDelete === acc.id && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 bg-background rounded-full"
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
