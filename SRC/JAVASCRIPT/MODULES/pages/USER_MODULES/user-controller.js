import { closeMenu, cleanRoot, reCaptchaKeyAPI, clearDOMPurify} from "../../utils.js";


export async function insertUserProfileMenu (mainContainer){
    const template = `
    <div class="userProfileMenu flex flex-column">
        <div class="userProfileMenu-header">
            <h2>Профиль пользователя</h2>
        </div>
    </div>
    `
    const clean = clearDOMPurify(template);
    mainContainer.insertAdjacentHTML("beforeend", clean);

}