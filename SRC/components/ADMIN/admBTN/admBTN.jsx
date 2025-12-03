import '../index.admin.css';

const RunAdminPanelButton = ({ isActive }) => {
  return (
    <li className={`root-nav-item-admin flex gradient-border ${isActive ? 'activeAdmBtn' : ''}`}>
      <div className="root-nav-item-icon pointer root-nav-item-admin flex flex-row">
        <div className="admin-button-icons a img"></div>
        <div className="admin-button-icons d img"></div>
        <div className="admin-button-icons m img"></div>
        <div className="admin-button-icons i img"></div>
        <div className="admin-button-icons n img"></div>
      </div>
    </li>
  );
};

export default RunAdminPanelButton;