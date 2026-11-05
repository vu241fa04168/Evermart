import { useContext } from 'react'
import { CartContext } from '../contexts/contextObjects.js'

export function useCart() {
  return useContext(CartContext)
}
