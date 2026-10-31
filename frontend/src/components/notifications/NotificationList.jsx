import NotificationItem from './NotificationItem.jsx'
import EmptyState from '../common/EmptyState.jsx'
export default function NotificationList({notifications=[],onRead}){if(!notifications.length)return <EmptyState title="No notifications" description="New schedule, booking, and campus updates will appear here."/>;return <div className="space-y-3">{notifications.map((item,index)=><NotificationItem key={item.id??item.notificationId??index} notification={item} onRead={onRead}/>)}</div>}
