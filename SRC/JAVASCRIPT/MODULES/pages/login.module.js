export default function Login(root) {
    const insertLogin = () => {
      root.insertAdjacentHTML(
        "beforeend",
        `
              
          <div class="login-container-blur flex bru">
  
  
    
              <div class="login-container flex flex-column bru">
              <div class="radio flex flex-row">
                <input label="REG" type="radio" id="reg" name="sign" value="reg" checked bru>
                <input label="LOGIN" type="radio" id="login" name="sign" value="login" bru>
              </div>
                  <h1 class="login-title">Registration</h1>
              
              <div class="login-container-body flex flex-column">
                  <input type="email" placeholder="Email" class="email-input bru">
                  <input type="password" placeholder="Password" class="password-input bru">
                  <button class="login-button bru login-submit">Login</button>
                  <button class="login-button bru login-register">Registration</button>
              </div>
      </div>
          </div>
          `
      );
    };
  
    insertLogin();
  
  
  const reg = document.querySelector("#reg");
  const login = document.querySelector("#login");
  
  
  reg.addEventListener("change", () => {
    if (reg.checked) {
      document.querySelector(".login-title").textContent = "Registration"; //меняет текст заголовка на "Registration"
  
      document.querySelector(".email-input").style.display = "block"; //показывает инпут email
  
      document.querySelector(".login-submit").style.display = "none"; //скрывает кнопку регистрации
      document.querySelector(".login-register").style.display = "block"; //показывает кнопку входа
    }
  })
  
  login.addEventListener("change", () => {
    if (login.checked) {
      document.querySelector(".login-title").textContent = "Login"; //меняет текст заголовка на "Login"
      document.querySelector(".login-submit").style.display = "block"; //показывает кнопку входа
      document.querySelector(".login-register").style.display = "none"; //скрывает кнопку регистрации
  
      document.querySelector(".email-input").style.display = "block"; //скрывает инпут email
    }
  })
  
  
    // Обработка фокуса на INPUT:
    //если фокус на инпуте, то добавляется класс эффкт BLUR пропадает
    document.querySelector(".email-input").addEventListener("focus", () =>
        document.querySelector(".login-container-blur").classList.add("inputFocus")
      );
    document.querySelector(".email-input").addEventListener("blur", () =>
        document.querySelector(".login-container-blur").classList.remove("inputFocus")
      );
    document.querySelector(".password-input").addEventListener("focus", () =>
        document.querySelector(".login-container-blur").classList.add("inputFocus")
      );
    document.querySelector(".password-input").addEventListener("blur", () =>
        document.querySelector(".login-container-blur").classList.remove("inputFocus")
      );
  
  }

  