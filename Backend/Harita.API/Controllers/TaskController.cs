using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization; // <-- EKLENDİ
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TaskController : ControllerBase
    {
        private readonly ITaskService _taskService;

        public TaskController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _taskService.GetAllAsync();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateTaskDto dto)
        {
            var result = await _taskService.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateTaskDto dto)
        {
            try 
            {
                var result = await _taskService.UpdateAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _taskService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}