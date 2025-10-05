import * as React from 'react'

const SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
const SCRIPT_ID = 'elevenlabs-convai-script'
const AGENT_ID = 'agent_9401k630rg84ecn80pe5vff5xjv9'

export default function ElevenLabsWidget() {
  React.useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.type = 'text/javascript'
    script.id = SCRIPT_ID
    document.body.appendChild(script)
  }, [])

  return (
    <elevenlabs-convai agent-id={AGENT_ID}></elevenlabs-convai>
  )
}
