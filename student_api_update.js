  async uploadStudentPhoto(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'X-Admin-Pin': this.state.adminToken },
        body: formData
      }).then(r => r.json());

      if (res.success && res.url) {
        document.getElementById('stPhotoUrl').value = res.url;
        this.showToast('Photo uploaded!', 'success');
      } else {
        this.showToast(res.error || 'Upload failed', 'error');
      }
    } catch (e) {
      this.showToast('Upload error', 'error');
    }
  },
