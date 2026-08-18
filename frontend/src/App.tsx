import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManagementPage } from '@/features/users/UserManagementPage'

const queryClient = new QueryClient()

function App() {
  return <QueryClientProvider client={queryClient}><UserManagementPage /></QueryClientProvider>
}

export default App
