function NotificationInfo({ text }) {
  return (
    <div
      className="notification click_notification info flex flex-row bru pointer"
    >
      <div className="info_icon notification_img img"></div>
      <div className="text">{text}</div>
    </div>
  );
}

export default NotificationInfo;
