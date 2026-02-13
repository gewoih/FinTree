using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Subscriptions;

namespace FinTree.Application.Users;

public readonly record struct SimulateSubscriptionPaymentRequest(
    [property: Required] SubscriptionPlan Plan);
