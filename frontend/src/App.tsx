import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManagementPage } from '@/features/users/UserManagementPage'
import { CatalogManagementPage } from '@/features/catalog/CatalogManagementPage'
import { createAgreement, getAgreements, setAgreementActive, updateAgreement } from '@/features/catalog/agreementsApi'
import { createCompany, getCompanies, setCompanyActive, updateCompany } from '@/features/catalog/companiesApi'
import type { Agreement, AgreementForm, Company, CompanyForm } from '@/features/catalog/types'
import { useState } from 'react'

const queryClient = new QueryClient()

function App() {
  const [screen, setScreen] = useState<'users' | 'companies' | 'agreements'>('users')
  return <QueryClientProvider client={queryClient}><div className="border-b border-slate-200 bg-white px-4 py-3"><nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto" aria-label="Administración"><button onClick={() => setScreen('users')} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">Usuarios</button><button onClick={() => setScreen('companies')} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">Empresas</button><button onClick={() => setScreen('agreements')} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">Convenios</button></nav></div>{screen === 'users' && <UserManagementPage />}{screen === 'companies' && <CatalogManagementPage<Company, CompanyForm> kind="companies" title="Empresas" description="Administrá las empresas disponibles para completar documentos." emptyForm={{ nombre: '' }} getItems={getCompanies} createItem={createCompany} updateItem={updateCompany} setActive={setCompanyActive} />}{screen === 'agreements' && <CatalogManagementPage<Agreement, AgreementForm> kind="agreements" title="Convenios" description="Administrá los convenios disponibles para completar documentos." emptyForm={{ codigo: '', descripcion: '' }} getItems={getAgreements} createItem={createAgreement} updateItem={updateAgreement} setActive={setAgreementActive} />}</QueryClientProvider>
}

export default App
