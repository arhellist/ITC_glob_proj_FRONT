//import { API_URL } from"../http/axios.js"
import AuthService from "../services/AuthService.js"
import axiosAPI from '../http/axios.js'

console.log(`class Store has been started`)

export default class Store {
  
  user = {};
  isAuth = false;
  constructor() {
  }

  setAuth(bool) {
    this.isAuth = bool;
  }
  setUser(user) {
    this.user = user;
    
  }

  async login(email, password) {
    try {
      const response = await AuthService.login(email, password);
      console.log(response);
      localStorage.setItem("token", response.data.accessToken);
      this.setAuth(true);
      this.setUser(response.data.user);
    } catch (error) {
      console.log(error.response?.data?.message);
    }
  }

  async registration(email, password) {
    try {
      const response = await AuthService.registration(email, password);
      console.log(response);
      localStorage.setItem("token", response.data.accessToken);
      this.setAuth(true);
      this.setUser(response.data.user);
    } catch (error) {
      console.log(error.response?.data?.message);
    }
  }

  async logout() {
    try {
        const response =  await AuthService.logout();
        console.log(response);
      localStorage.removeItem("token");
      this.setAuth(false);
      this.setUser({});
    } catch (error) {
      console.log(error.response?.data?.message);
    }
  }

  async checkAuth(){
    console.log(`checkAuth`)
    try {
        const response = await axios.get(`/auth/refresh`, {withCredentials: true});
        console.log(response);
        localStorage.setItem("token", response.data.accessToken);
        this.setAuth(true);
        this.setUser(response.data.user);
    } catch (error) {
        console.log(error.response?.data?.message);
        }
  }
}
