import React from 'react'

export default function Button({children, className = '', onClick, type = 'button', disabled = false, ...rest}){
	const base = 'btn'
	return (
		<button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} {...rest}>
			{children}
		</button>
	)
}
