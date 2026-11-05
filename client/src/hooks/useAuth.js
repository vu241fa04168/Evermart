import { useContext } from 'react'
import { AuthContext } from '../contexts/contextObjects.js'

export function useAuth() {
  return useContext(AuthContext)
}
