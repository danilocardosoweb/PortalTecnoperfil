import React from 'react'
import cls from 'classnames'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export function Button({variant='secondary', className, children, ...rest}: Props){
  const base = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-pill border font-medium transition duration-fast focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-primary text-white border-primary hover:bg-primary-hover',
    secondary: 'bg-surface text-text border-border hover:border-primary hover:text-primary',
    danger: 'bg-danger text-white border-danger hover:bg-danger/90 hover:border-danger',
    ghost: 'bg-transparent border-transparent text-text hover:bg-gray-100 focus:ring-offset-0'
  } as const
  return (
    <button className={cls(base, styles[variant], className)} {...rest}>{children}</button>
  )
}
