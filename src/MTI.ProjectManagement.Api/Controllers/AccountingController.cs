using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountingController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IAuditService _auditService;

    public AccountingController(
        IAppDbContext dbContext,
        ICurrentUserService currentUserService,
        IMediaStorageService mediaStorage,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _mediaStorage = mediaStorage;
        _auditService = auditService;
    }

    /// <summary>
    /// Enforces Accounting Workspace Isolation (Prompt ACCOUNTING-01)
    /// </summary>
    private bool HasAccountingPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Roles.Contains("Accountant") ||
               _currentUserService.Roles.Contains("Executive") ||
               _currentUserService.Permissions.Contains(permission);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<AccountingDashboardStatsDto>> GetDashboardStats(CancellationToken cancellationToken)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
        {
            return Forbid();
        }

        var invoices = await _dbContext.ProjectInvoices
            .AsNoTracking()
            .Where(i => !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalInvoiced = invoices.Sum(i => i.Total > 0 ? i.Total : (i.Amount + i.Tax));
        var totalPaid = invoices.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.Total > 0 ? i.Total : (i.Amount + i.Tax));
        var totalDue = invoices.Where(i => i.Status == InvoiceStatus.Sent || i.Status == InvoiceStatus.Approved || i.Status == InvoiceStatus.PartiallyPaid).Sum(i => i.Total > 0 ? i.Total : (i.Amount + i.Tax));
        var totalOverdue = invoices.Where(i => i.Status == InvoiceStatus.Overdue || (i.DueDate.HasValue && i.DueDate.Value < DateTime.UtcNow && i.Status != InvoiceStatus.Paid)).Sum(i => i.Total > 0 ? i.Total : (i.Amount + i.Tax));

        var totalInvoicesCount = invoices.Count;
        var dueCount = invoices.Count(i => i.Status == InvoiceStatus.Sent || i.Status == InvoiceStatus.Approved);
        var overdueCount = invoices.Count(i => i.Status == InvoiceStatus.Overdue || (i.DueDate.HasValue && i.DueDate.Value < DateTime.UtcNow && i.Status != InvoiceStatus.Paid));
        var pendingApprovalCount = invoices.Count(i => i.Status == InvoiceStatus.PendingApproval);

        // Approved BOQs count & value
        var approvedBoqItems = await _dbContext.BoqItems
            .AsNoTracking()
            .Where(b => !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalApprovedBoqValue = approvedBoqItems.Sum(b => b.TotalPrice);
        var approvedBoqCount = approvedBoqItems.Count;

        return Ok(new AccountingDashboardStatsDto(
            totalInvoiced,
            totalPaid,
            totalDue,
            totalOverdue,
            totalInvoicesCount,
            dueCount,
            overdueCount,
            pendingApprovalCount,
            totalApprovedBoqValue,
            approvedBoqCount
        ));
    }

    [HttpGet("invoices")]
    public async Task<ActionResult<List<AccountingInvoiceDto>>> GetInvoices(
        [FromQuery] Guid? projectId = null,
        [FromQuery] InvoiceStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
        {
            return Forbid();
        }

        var query = _dbContext.ProjectInvoices
            .AsNoTracking()
            .Include(i => i.Project)
            .Where(i => !i.IsDeleted);

        if (projectId.HasValue)
        {
            query = query.Where(i => i.ProjectId == projectId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync(cancellationToken);

        var list = new List<AccountingInvoiceDto>();
        foreach (var i in invoices)
        {
            string? downloadUrl = null;
            if (i.AttachmentMediaFileId.HasValue)
            {
                var mf = await _dbContext.MediaFiles.AsNoTracking().FirstOrDefaultAsync(m => m.Id == i.AttachmentMediaFileId.Value, cancellationToken: cancellationToken);
                if (mf != null)
                {
                    downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mf.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);
                }
            }

            var totalVal = i.Total > 0 ? i.Total : (i.Amount + i.Tax);

            list.Add(new AccountingInvoiceDto(
                i.Id,
                i.ProjectId,
                i.Project?.Name ?? "Project",
                i.InvoiceNumber,
                i.InvoiceDate,
                i.DueDate,
                i.PaidDate,
                i.Amount,
                i.Tax,
                totalVal,
                i.Currency,
                i.Status,
                i.Notes,
                i.DocumentId,
                null,
                i.AttachmentMediaFileId,
                downloadUrl,
                i.CreatedBy ?? Guid.Empty,
                i.CreatedAt
            ));
        }

        return Ok(list);
    }

    [HttpGet("invoices/{id}")]
    public async Task<ActionResult<AccountingInvoiceDto>> GetInvoiceById(Guid id, CancellationToken cancellationToken)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
        {
            return Forbid();
        }

        var i = await _dbContext.ProjectInvoices
            .AsNoTracking()
            .Include(x => x.Project)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken: cancellationToken);

        if (i == null) return NotFound(new { message = "Invoice not found." });

        string? downloadUrl = null;
        if (i.AttachmentMediaFileId.HasValue)
        {
            var mf = await _dbContext.MediaFiles.AsNoTracking().FirstOrDefaultAsync(m => m.Id == i.AttachmentMediaFileId.Value, cancellationToken: cancellationToken);
            if (mf != null)
            {
                downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mf.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);
            }
        }

        var totalVal = i.Total > 0 ? i.Total : (i.Amount + i.Tax);

        return Ok(new AccountingInvoiceDto(
            i.Id,
            i.ProjectId,
            i.Project?.Name ?? "Project",
            i.InvoiceNumber,
            i.InvoiceDate,
            i.DueDate,
            i.PaidDate,
            i.Amount,
            i.Tax,
            totalVal,
            i.Currency,
            i.Status,
            i.Notes,
            i.DocumentId,
            null,
            i.AttachmentMediaFileId,
            downloadUrl,
            i.CreatedBy ?? Guid.Empty,
            i.CreatedAt
        ));
    }

    [HttpPost("invoices")]
    public async Task<ActionResult<AccountingInvoiceDto>> CreateInvoice(
        [FromBody] CreateAccountingInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
        {
            return Forbid();
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var total = request.Amount + request.Tax;

        var invoice = new ProjectInvoice
        {
            ProjectId = request.ProjectId,
            InvoiceNumber = request.InvoiceNumber.Trim(),
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            Amount = request.Amount,
            Tax = request.Tax,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "EGP" : request.Currency,
            Status = InvoiceStatus.Draft,
            Notes = request.Notes,
            DocumentId = request.DocumentId,
            CreatedBy = userId
        };

        _dbContext.ProjectInvoices.Add(invoice);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateInvoice",
            "ProjectInvoice",
            invoice.Id.ToString(),
            null,
            new { invoice.InvoiceNumber, invoice.Amount, total, invoice.Status },
            cancellationToken: cancellationToken);

        var project = await _dbContext.Projects.FindAsync(new object[] { invoice.ProjectId }, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetInvoiceById), new { id = invoice.Id }, new AccountingInvoiceDto(
            invoice.Id,
            invoice.ProjectId,
            project?.Name ?? "",
            invoice.InvoiceNumber,
            invoice.InvoiceDate,
            invoice.DueDate,
            invoice.PaidDate,
            invoice.Amount,
            invoice.Tax,
            invoice.Total,
            invoice.Currency,
            invoice.Status,
            invoice.Notes,
            invoice.DocumentId,
            null,
            null,
            null,
            invoice.CreatedBy ?? userId,
            invoice.CreatedAt
        ));
    }

    [HttpPut("invoices/{id}/status")]
    public async Task<ActionResult> UpdateInvoiceStatus(
        Guid id,
        [FromBody] UpdateAccountingInvoiceStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
        {
            return Forbid();
        }

        var invoice = await _dbContext.ProjectInvoices.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted, cancellationToken: cancellationToken);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        invoice.Status = request.Status;
        if (request.Status == InvoiceStatus.Paid)
        {
            invoice.PaidDate = request.PaidDate ?? DateTime.UtcNow;
        }
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            invoice.Notes = request.Notes;
        }

        invoice.UpdatedBy = userId;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UpdateInvoiceStatus",
            "ProjectInvoice",
            invoice.Id.ToString(),
            null,
            new { invoice.Status, invoice.PaidDate },
            cancellationToken: cancellationToken);

        return Ok(new { message = $"Invoice status updated to {invoice.Status}." });
    }

    [HttpGet("approved-boqs")]
    public async Task<ActionResult<List<ApprovedBoqSummaryDto>>> GetApprovedBoqs(
        [FromQuery] Guid? projectId = null,
        CancellationToken cancellationToken = default)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewApprovedBOQ))
        {
            return Forbid();
        }

        var query = _dbContext.BoqItems
            .AsNoTracking()
            .Include(b => b.Project)
            .Where(b => !b.IsDeleted);

        if (projectId.HasValue)
        {
            query = query.Where(b => b.ProjectId == projectId.Value);
        }

        var list = await query
            .OrderBy(b => b.ItemCode)
            .Select(b => new ApprovedBoqSummaryDto(
                b.Id,
                b.ProjectId,
                b.Project.Name,
                b.ItemCode,
                b.Description,
                b.Unit,
                b.Quantity,
                b.UnitPrice,
                b.TotalPrice,
                b.Category,
                b.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("commercial-documents")]
    public async Task<ActionResult<List<CommercialDocumentDto>>> GetCommercialDocuments(
        [FromQuery] Guid? projectId = null,
        CancellationToken cancellationToken = default)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewCommercialDocuments))
        {
            return Forbid();
        }

        var query = _dbContext.CommercialOffers
            .AsNoTracking()
            .Include(c => c.Project)
            .Include(c => c.DocumentMediaFile)
            .Where(c => !c.IsDeleted);

        if (projectId.HasValue)
        {
            query = query.Where(c => c.ProjectId == projectId.Value);
        }

        var offers = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = new List<CommercialDocumentDto>();
        foreach (var c in offers)
        {
            string? downloadUrl = null;
            if (c.DocumentMediaFile != null)
            {
                downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(c.DocumentMediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);
            }

            list.Add(new CommercialDocumentDto(
                c.Id,
                c.ProjectId,
                c.Project?.Name ?? "Project",
                c.Title,
                "CommercialOffer",
                c.TotalAmount,
                c.Currency,
                c.Status.ToString(),
                c.Version,
                downloadUrl,
                c.CreatedAt
            ));
        }

        return Ok(list);
    }

    /// <summary>UI-ACCOUNTING: Purchase orders stub (no PurchaseOrder entity).</summary>
    [HttpGet("purchase-orders")]
    public ActionResult<List<object>> GetPurchaseOrders()
    {
        if (!HasAccountingPermission(Permissions.AccountingViewPurchaseOrders))
            return Forbid();

        // No PurchaseOrder entity in domain — return empty list stub
        return Ok(new List<object>());
    }

    /// <summary>UI-ACCOUNTING: Payments derived from Paid invoices.</summary>
    [HttpGet("payments")]
    public async Task<ActionResult<List<object>>> GetPayments(
        [FromQuery] Guid? projectId = null,
        CancellationToken cancellationToken = default)
    {
        if (!HasAccountingPermission(Permissions.AccountingViewInvoices))
            return Forbid();

        var query = _dbContext.ProjectInvoices.AsNoTracking()
            .Include(i => i.Project)
            .Where(i => !i.IsDeleted && i.Status == InvoiceStatus.Paid);

        if (projectId.HasValue)
            query = query.Where(i => i.ProjectId == projectId.Value);

        var payments = await query
            .OrderByDescending(i => i.PaidDate ?? i.CreatedAt)
            .Select(i => new
            {
                id = i.Id,
                invoiceId = i.Id,
                invoiceNumber = i.InvoiceNumber,
                projectId = i.ProjectId,
                projectName = i.Project != null ? i.Project.Name : "Project",
                amount = i.Total > 0 ? i.Total : (i.Amount + i.Tax),
                currency = i.Currency,
                paidDate = i.PaidDate,
                status = "Paid"
            })
            .ToListAsync(cancellationToken);

        return Ok(payments.Cast<object>().ToList());
    }
}


