using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    public interface IContactController
    {
        Task<IActionResult> Create(CreateContactDto dto);
        Task<IActionResult> Delete(Guid id);
        Task<IActionResult> GetAll();
        Task<IActionResult> Update(Guid id, UpdateContactDto dto);
    }

    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase, IContactController
    {
        private readonly IContactService _contactService;

        public ContactController(IContactService contactService)
        {
            _contactService = contactService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var contacts = await _contactService.GetAllAsync();
            return Ok(contacts);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateContactDto dto)
        {
            var result = await _contactService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _contactService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateContactDto dto)
        {
            try
            {
                var result = await _contactService.UpdateAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}