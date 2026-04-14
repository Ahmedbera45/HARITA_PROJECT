using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface INoteService
    {
        Task<List<NoteCategoryDto>> GetCategoriesAsync();
        Task<NoteCategoryDto> CreateCategoryAsync(CreateNoteCategoryDto dto);
        Task<NoteCategoryDto> UpdateCategoryAsync(Guid id, CreateNoteCategoryDto dto);
        Task<bool> DeleteCategoryAsync(Guid id);

        Task<List<NoteListItemDto>> GetNotesAsync(Guid? categoryId);
        Task<NoteDetailDto?> GetNoteByIdAsync(Guid id);
        Task<NoteDetailDto> CreateNoteAsync(CreateNoteDto dto);
        Task<NoteDetailDto> UpdateNoteAsync(Guid id, UpdateNoteDto dto);
        Task<bool> DeleteNoteAsync(Guid id);

        Task<NoteShareDto> ShareNoteAsync(Guid noteId, ShareNoteDto dto);
        Task<bool> RemoveShareAsync(Guid noteId, Guid shareId);

        Task<NoteFileDto> UploadFileAsync(Guid noteId, IFormFile file);
        Task<bool> DeleteFileAsync(Guid noteId, Guid fileId);
    }
}
