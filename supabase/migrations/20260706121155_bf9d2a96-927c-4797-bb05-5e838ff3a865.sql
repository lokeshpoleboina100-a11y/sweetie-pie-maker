REVOKE EXECUTE ON FUNCTION public.get_own_phone() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_job_chat(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.get_own_phone() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_access_job_chat(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;