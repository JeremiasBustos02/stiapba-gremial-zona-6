import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) { return <table className={`w-full caption-bottom text-sm ${className}`} {...props} /> }
export function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <thead className={`[&_tr]:border-b ${className}`} {...props} /> }
export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) { return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} /> }
export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) { return <tr className={`border-b transition-colors hover:bg-slate-50 ${className}`} {...props} /> }
export function TableHead({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) { return <th className={`h-12 px-4 text-left align-middle text-xs font-bold uppercase tracking-wide text-slate-500 ${className}`} {...props} /> }
export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) { return <td className={`p-4 align-middle text-slate-700 ${className}`} {...props} /> }
