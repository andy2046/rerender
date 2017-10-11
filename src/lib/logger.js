import { Bristol } from 'bristol'
import palin from 'palin'

const logger = new Bristol()
logger.addTarget('console').withFormatter(palin, {
  rootFolderName: 'rerender' // Edit this to match foldername
})

export default logger
