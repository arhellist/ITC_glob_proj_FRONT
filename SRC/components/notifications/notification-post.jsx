function NotificationPost({ text }) {
  return (
    <div
      className="notification click_notification post flex flex-row bru pointer"
      data-id="${id}"
    >
      <div className="cancel_icon_notification img"></div>

      <div className="post_icon notification_img img"></div>
      <div className="text">${text}</div>
    </div>
  );
}

export default NotificationPost;
