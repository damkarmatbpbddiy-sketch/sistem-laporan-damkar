/* ============================================================
   ADMIN LOGIN JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to admin dashboard
  if (isLoggedIn()) {
    window.location.href = 'admin.html';
    return;
  }

  const formLogin = document.getElementById('form-login');
  const btnLogin = document.getElementById('btn-login');
  const loginAlert = document.getElementById('login-alert');
  const loginAlertText = document.getElementById('login-alert-text');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        showError('Username dan password wajib diisi.');
        return;
      }

      hideError();

      try {
        btnLogin.disabled = true;
        btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Memproses Login...`;

        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Store token in localStorage
          localStorage.setItem('adminToken', result.token);
          localStorage.setItem('adminUser', JSON.stringify(result.admin));

          Swal.fire({
            title: 'Login Berhasil!',
            text: `Selamat datang kembali, ${result.admin.username}.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            window.location.href = 'admin.html';
          });

        } else {
          showError(result.message || 'Login gagal. Periksa username dan password Anda.');
        }

      } catch (error) {
        console.error('Error during login:', error);
        showError('Terjadi kesalahan koneksi ke server backend.');
      } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> MASUK SYSTEM ADMIN`;
      }
    });
  }

  function showError(msg) {
    loginAlertText.textContent = msg;
    loginAlert.classList.remove('d-none');
  }

  function hideError() {
    loginAlert.classList.add('d-none');
  }
});
