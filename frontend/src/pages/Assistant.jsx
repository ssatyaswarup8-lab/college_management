import AssistantPanel from '../components/assistant/AssistantPanel.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
export default function Assistant(){return <div className="space-y-5"><PageHeader eyebrow="Schedule support" title="CIT Assistant" description="Ask questions or propose changes in natural language. The backend validates every proposal before it can be applied."/><div className="mx-auto max-w-4xl"><AssistantPanel/></div></div>}
