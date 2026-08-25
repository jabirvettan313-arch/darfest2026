  async renderResultsView() {
    const main = document.getElementById('appMain');
    
    // Fetch once and cache
    if (!this.state.allResultsCache) {
      try {
        const res = await fetch(`${API_BASE}/results`).then(r => r.json());
        if (res.success) {
          this.state.allResultsCache = res.results;
        } else {
          this.state.allResultsCache = [];
        }
      } catch (e) {
        console.error(e);
        this.state.allResultsCache = [];
      }
    }

    let results = [...this.state.allResultsCache];

    // Client-side filtering
    if (this.state.selectedCategoryFilter) {
      results = results.filter(r => String(r.category_id) === String(this.state.selectedCategoryFilter));
    }
    if (this.state.selectedHouseFilter) {
      results = results.filter(r => r.winners.some(w => String(w.house_id) === String(this.state.selectedHouseFilter)));
    }
    if (this.state.selectedTypeFilter) {
      results = results.filter(r => r.programme_type === this.state.selectedTypeFilter);
    }
    if (this.state.selectedFormatFilter) {
      results = results.filter(r => r.format === this.state.selectedFormatFilter);
    }
    if (this.state.resultSearchQuery) {
      const q = this.state.resultSearchQuery.toLowerCase();
      results = results.filter(r => 
        (r.programme_name && r.programme_name.toLowerCase().includes(q)) ||
        (r.programme_code && r.programme_code.toLowerCase().includes(q)) ||
        (r.category_name && r.category_name.toLowerCase().includes(q)) ||
        (r.stage_name && r.stage_name.toLowerCase().includes(q))
      );
    }

    // Client-side sorting
    if (this.state.resultSortBy === 'oldest') {
      results.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    } else if (this.state.resultSortBy === 'name') {
      results.sort((a, b) => (a.programme_name || '').localeCompare(b.programme_name || ''));
    } else {
      // latest
      results.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    let totalCount = results.length;
