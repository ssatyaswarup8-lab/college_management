import StatusBadge from '../common/StatusBadge.jsx'
import { formatDateTime } from '../../utils/formatters.js'
export default function NotificationItem({notification,onRead}){
 const id=notification.id??notification._id??notification.notificationId??notification.notification_id
 const read=Boolean(notification.readAt??notification.read_at??notification.isRead??notification.is_read)
 return <article className={`rounded-xl border p-4 ${read?'border-slate-200 bg-white':'border-teal-200 bg-teal-50/40'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{notification.title??notification.subject??notification.type??'Notification'}</p><p className="mt-1 text-sm leading-6 text-slate-700">{notification.message??notification.body??notification.description??'No additional details provided.'}</p><p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt??notification.created_at??notification.timestamp)}</p></div><div className="flex items-center gap-2"><StatusBadge status={read?'read':'unread'}/>{!read&&id?<button className="min-h-9 rounded-lg border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50" onClick={()=>onRead?.(id)} type="button">Mark read</button>:null}</div></div></article>
}
