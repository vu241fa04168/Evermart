import { useContext } from 'react'
import { WishlistContext } from '../contexts/contextObjects.js'

export function useWishlist() {
  return useContext(WishlistContext)
}
