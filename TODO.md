# Task TODO: Create Post Detail Webpage (same as feed, opens on post click with post + comments)

## Steps from Approved Plan:
- [x] Create TODO.md
- [x] 1. Create post-detail.html (copy feed structure, add full post + comments section)
- [x] 2. Edit stylesheet.css (add styles for post-detail, comments-section, comment-item, full-post)
- [x] 3. Edit feed.html (add data-post-id="1/2/3" and onclick="readThread(this)" to each post-card's read-thread button)
- [x] 4. Edit script.js (add readThread function to handle navigation: window.location.href = `post-detail.html?id=${postId}`)
- [ ] 5. Verify changes

**Next Step:** Create post-detail.html

## Notes:
- Use static sample data matching feed.html posts.
- 5 sample comments per post.
- Reuse CSS classes heavily.
- URL param ?id=1/2/3 to select post.
