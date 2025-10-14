import React, { forwardRef } from 'react'
import cls from 'classnames'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...rest }, ref){
  return (
    <input
      ref={ref}
      className={cls(
        'w-full px-3 py-2 rounded-pill border border-border bg-surface text-text placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition duration-fast disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...rest}
    />
  )
})
