export default function ListItem({ thumbnail, title, subtitle, status, date, action, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div className="list-item-thumbnail">{thumbnail}</div>

      <div className="list-item-content">
        <p className="list-item-title">{title}</p>
        {subtitle && <p className="list-item-subtitle">{subtitle}</p>}
      </div>

      <div className="list-item-right">
        {status && <span status={status} />}
        {date && <span className="list-item-date">{date}</span>}
        {action}
      </div>
    </div>
  )
}

//{status && <StatusBadge status={status} />}
