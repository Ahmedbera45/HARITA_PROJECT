using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NoteController : ControllerBase
    {
        private readonly INoteService _noteService;

        public NoteController(INoteService noteService)
        {
            _noteService = noteService;
        }

        // ─── Kategoriler ────────────────────────────────────────────────

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
            => Ok(await _noteService.GetCategoriesAsync());

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateNoteCategoryDto dto)
        {
            try { return Ok(await _noteService.CreateCategoryAsync(dto)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CreateNoteCategoryDto dto)
        {
            try { return Ok(await _noteService.UpdateCategoryAsync(id, dto)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var result = await _noteService.DeleteCategoryAsync(id);
            return result ? NoContent() : NotFound();
        }

        // ─── Notlar ─────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetNotes([FromQuery] Guid? categoryId)
            => Ok(await _noteService.GetNotesAsync(categoryId));

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            try
            {
                var result = await _noteService.GetNoteByIdAsync(id);
                return result == null ? NotFound() : Ok(result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateNoteDto dto)
        {
            try { return Ok(await _noteService.CreateNoteAsync(dto)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNoteDto dto)
        {
            try { return Ok(await _noteService.UpdateNoteAsync(id, dto)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await _noteService.DeleteNoteAsync(id);
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // ─── Paylaşım ───────────────────────────────────────────────────

        [HttpPost("{id}/shares")]
        public async Task<IActionResult> Share(Guid id, [FromBody] ShareNoteDto dto)
        {
            try { return Ok(await _noteService.ShareNoteAsync(id, dto)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}/shares/{shareId}")]
        public async Task<IActionResult> RemoveShare(Guid id, Guid shareId)
        {
            try
            {
                var result = await _noteService.RemoveShareAsync(id, shareId);
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // ─── Dosyalar ───────────────────────────────────────────────────

        [HttpPost("{id}/files")]
        [RequestSizeLimit(20 * 1024 * 1024 + 1024)]
        public async Task<IActionResult> UploadFile(Guid id, IFormFile file)
        {
            try { return Ok(await _noteService.UploadFileAsync(id, file)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}/files/{fileId}")]
        public async Task<IActionResult> DeleteFile(Guid id, Guid fileId)
        {
            var result = await _noteService.DeleteFileAsync(id, fileId);
            return result ? NoContent() : NotFound();
        }
    }
}
