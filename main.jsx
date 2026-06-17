import ReactDOM from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from '@archera/design-system/theme'
import App from './CustomPlanBuilder.jsx'
import PtuPlanner from './PtuPlanner.jsx'
import DemoIndex from './DemoIndex.jsx'

const demo = new URLSearchParams(window.location.search).get('demo')

function Screen() {
  if (demo === null) return <DemoIndex />
  if (demo === 'ptu') return <PtuPlanner />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Screen />
  </ThemeProvider>
)
