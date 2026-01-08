import { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Bildirim göstermek için

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Sayfanın yenilenmesini engelle

    try {
      // Servisi çağır
      const data = await authService.login(email, password);
      
      // Gelen token'ı tarayıcı hafızasına kaydet
      // (Backend cevabında token'ın 'token' adıyla mı 'accessToken' adıyla mı geldiğine dikkat etmeliyiz.
      // Senin AuthController kodunda 'Token' olarak dönüyordu sanırım, burayı response yapısına göre güncelleriz.)
      if (data.token) {
        localStorage.setItem('token', data.token);
        toast.success("Giriş Başarılı!");
        navigate('/'); // Ana sayfaya yönlendir
      } else {
         // Eğer direkt string dönüyorsa (bazen sadece token string döner)
         localStorage.setItem('token', data);
         toast.success("Giriş Başarılı!");
         navigate('/');
      }

    } catch (error) {
      console.error("Login Hatası:", error);
      toast.error("Giriş başarısız! E-posta veya şifre hatalı.");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Giriş Yap</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label>Şifre:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          Giriş Yap
        </button>
      </form>
    </div>
  );
};

export default Login;