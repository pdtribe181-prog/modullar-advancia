/**
 * API Service Tests
 * Covers all CRUD service wrappers: userProfiles, patients, providers,
 * appointments, transactions, invoices, notifications, apiKeys, webhooks, disputes
 */
import { jest } from '@jest/globals';

function createChain(finalResult: any) {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.insert = jest.fn<any>().mockReturnValue(c);
  c.update = jest.fn<any>().mockReturnValue(c);
  c.delete = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.order = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

let currentChain: any;

const mockFrom = jest.fn<any>().mockImplementation(() => currentChain);

jest.unstable_mockModule('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

const {
  userProfilesService,
  patientsService,
  providersService,
  appointmentsService,
  transactionsService,
  invoicesService,
  notificationsService,
  apiKeysService,
  webhooksService,
  disputesService,
} = await import('../services/api.service.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('API Service', () => {
  // ---------- User Profiles ----------
  describe('userProfilesService', () => {
    it('getById returns a user', async () => {
      currentChain = createChain({ data: { id: 'u1', full_name: 'John' }, error: null });
      const result = await userProfilesService.getById('u1');
      expect(result).toEqual({ id: 'u1', full_name: 'John' });
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('getById throws on error', async () => {
      currentChain = createChain({ data: null, error: { message: 'Not found' } });
      await expect(userProfilesService.getById('u1')).rejects.toEqual({ message: 'Not found' });
    });

    it('update returns updated data', async () => {
      currentChain = createChain({ data: { id: 'u1', full_name: 'Jane' }, error: null });
      const result = await userProfilesService.update('u1', { full_name: 'Jane' });
      expect(result).toEqual({ id: 'u1', full_name: 'Jane' });
    });
  });

  // ---------- Patients ----------
  describe('patientsService', () => {
    it('getAll returns patients', async () => {
      currentChain = createChain({ data: [{ id: 'p1' }], error: null });
      const result = await patientsService.getAll();
      expect(result).toEqual([{ id: 'p1' }]);
    });

    it('getById returns a patient', async () => {
      currentChain = createChain({ data: { id: 'p1' }, error: null });
      const result = await patientsService.getById('p1');
      expect(result).toEqual({ id: 'p1' });
    });

    it('create returns new patient', async () => {
      currentChain = createChain({ data: { id: 'p2' }, error: null });
      const result = await patientsService.create({ user_id: 'u1' });
      expect(result).toEqual({ id: 'p2' });
    });

    it('update returns updated patient', async () => {
      currentChain = createChain({ data: { id: 'p1', insurance: 'Blue' }, error: null });
      const result = await patientsService.update('p1', { insurance: 'Blue' });
      expect(result).toEqual({ id: 'p1', insurance: 'Blue' });
    });

    it('getAll throws on error', async () => {
      currentChain = createChain({ data: null, error: { message: 'DB error' } });
      await expect(patientsService.getAll()).rejects.toEqual({ message: 'DB error' });
    });
  });

  // ---------- Providers ----------
  describe('providersService', () => {
    it('getAll returns providers', async () => {
      currentChain = createChain({ data: [{ id: 'prov1' }], error: null });
      const result = await providersService.getAll();
      expect(result).toEqual([{ id: 'prov1' }]);
    });

    it('getById returns a provider', async () => {
      currentChain = createChain({ data: { id: 'prov1' }, error: null });
      const result = await providersService.getById('prov1');
      expect(result).toEqual({ id: 'prov1' });
    });

    it('getBySpecialty filters providers', async () => {
      currentChain = createChain({ data: [{ id: 'prov1', specialty: 'Cardiology' }], error: null });
      const result = await providersService.getBySpecialty('Cardiology');
      expect(result).toEqual([{ id: 'prov1', specialty: 'Cardiology' }]);
    });

    it('update returns updated provider', async () => {
      currentChain = createChain({ data: { id: 'prov1' }, error: null });
      const result = await providersService.update('prov1', { npi: '1234' });
      expect(result).toEqual({ id: 'prov1' });
    });
  });

  // ---------- Appointments ----------
  describe('appointmentsService', () => {
    it('getByPatient returns appointments', async () => {
      currentChain = createChain({ data: [{ id: 'a1' }], error: null });
      const result = await appointmentsService.getByPatient('p1');
      expect(result).toEqual([{ id: 'a1' }]);
    });

    it('getByProvider returns appointments', async () => {
      currentChain = createChain({ data: [{ id: 'a2' }], error: null });
      const result = await appointmentsService.getByProvider('prov1');
      expect(result).toEqual([{ id: 'a2' }]);
    });

    it('create returns new appointment', async () => {
      currentChain = createChain({ data: { id: 'a3' }, error: null });
      const result = await appointmentsService.create({ patient_id: 'p1' });
      expect(result).toEqual({ id: 'a3' });
    });

    it('updateStatus changes status', async () => {
      currentChain = createChain({ data: { id: 'a1', status: 'confirmed' }, error: null });
      const result = await appointmentsService.updateStatus('a1', 'confirmed');
      expect(result).toEqual({ id: 'a1', status: 'confirmed' });
    });
  });

  // ---------- Transactions ----------
  describe('transactionsService', () => {
    it('getByPatient returns transactions', async () => {
      currentChain = createChain({ data: [{ id: 't1' }], error: null });
      const result = await transactionsService.getByPatient('p1');
      expect(result).toEqual([{ id: 't1' }]);
    });

    it('getByProvider returns transactions', async () => {
      currentChain = createChain({ data: [{ id: 't2' }], error: null });
      const result = await transactionsService.getByProvider('prov1');
      expect(result).toEqual([{ id: 't2' }]);
    });

    it('create returns new transaction', async () => {
      currentChain = createChain({ data: { id: 't3' }, error: null });
      const result = await transactionsService.create({ amount: 5000 });
      expect(result).toEqual({ id: 't3' });
    });

    it('updateStatus changes payment status', async () => {
      currentChain = createChain({ data: { id: 't1', payment_status: 'completed' }, error: null });
      const result = await transactionsService.updateStatus('t1', 'completed');
      expect(result).toEqual({ id: 't1', payment_status: 'completed' });
    });
  });

  // ---------- Invoices ----------
  describe('invoicesService', () => {
    it('getByPatient returns invoices', async () => {
      currentChain = createChain({ data: [{ id: 'inv1' }], error: null });
      const result = await invoicesService.getByPatient('p1');
      expect(result).toEqual([{ id: 'inv1' }]);
    });

    it('getByProvider returns invoices', async () => {
      currentChain = createChain({ data: [{ id: 'inv2' }], error: null });
      const result = await invoicesService.getByProvider('prov1');
      expect(result).toEqual([{ id: 'inv2' }]);
    });

    it('create returns new invoice', async () => {
      currentChain = createChain({ data: { id: 'inv3' }, error: null });
      const result = await invoicesService.create({ patient_id: 'p1' });
      expect(result).toEqual({ id: 'inv3' });
    });

    it('updateStatus changes status', async () => {
      currentChain = createChain({ data: { id: 'inv1', status: 'paid' }, error: null });
      const result = await invoicesService.updateStatus('inv1', 'paid');
      expect(result).toEqual({ id: 'inv1', status: 'paid' });
    });
  });

  // ---------- Notifications ----------
  describe('notificationsService', () => {
    it('getUnread returns unread notifications', async () => {
      currentChain = createChain({ data: [{ id: 'n1', read_status: 'unread' }], error: null });
      const result = await notificationsService.getUnread('u1');
      expect(result).toEqual([{ id: 'n1', read_status: 'unread' }]);
    });

    it('markAsRead updates notification', async () => {
      currentChain = createChain({ data: { id: 'n1', read_status: 'read' }, error: null });
      const result = await notificationsService.markAsRead('n1');
      expect(result).toEqual({ id: 'n1', read_status: 'read' });
    });

    it('create returns new notification', async () => {
      currentChain = createChain({ data: { id: 'n2' }, error: null });
      const result = await notificationsService.create({ user_id: 'u1', type: 'test' });
      expect(result).toEqual({ id: 'n2' });
    });
  });

  // ---------- API Keys ----------
  describe('apiKeysService', () => {
    it('getByUser returns keys', async () => {
      currentChain = createChain({ data: [{ id: 'k1' }], error: null });
      const result = await apiKeysService.getByUser('u1');
      expect(result).toEqual([{ id: 'k1' }]);
    });

    it('create returns new key', async () => {
      currentChain = createChain({ data: { id: 'k2' }, error: null });
      const result = await apiKeysService.create({ user_id: 'u1' });
      expect(result).toEqual({ id: 'k2' });
    });

    it('revoke updates key status', async () => {
      currentChain = createChain({ data: { id: 'k1', status: 'revoked' }, error: null });
      const result = await apiKeysService.revoke('k1');
      expect(result).toEqual({ id: 'k1', status: 'revoked' });
    });
  });

  // ---------- Webhooks ----------
  describe('webhooksService', () => {
    it('getByUser returns webhooks', async () => {
      currentChain = createChain({ data: [{ id: 'w1' }], error: null });
      const result = await webhooksService.getByUser('u1');
      expect(result).toEqual([{ id: 'w1' }]);
    });

    it('create returns new webhook', async () => {
      currentChain = createChain({ data: { id: 'w2' }, error: null });
      const result = await webhooksService.create({ url: 'https://example.com' });
      expect(result).toEqual({ id: 'w2' });
    });

    it('update returns updated webhook', async () => {
      currentChain = createChain({ data: { id: 'w1', url: 'https://new.com' }, error: null });
      const result = await webhooksService.update('w1', { url: 'https://new.com' });
      expect(result).toEqual({ id: 'w1', url: 'https://new.com' });
    });

    it('delete removes webhook', async () => {
      currentChain = createChain({ error: null });
      await webhooksService.delete('w1');
      expect(mockFrom).toHaveBeenCalledWith('webhooks');
    });

    it('delete throws on error', async () => {
      currentChain = createChain({ error: { message: 'Not found' } });
      await expect(webhooksService.delete('w999')).rejects.toEqual({ message: 'Not found' });
    });
  });

  // ---------- Disputes ----------
  describe('disputesService', () => {
    it('getAll returns disputes', async () => {
      currentChain = createChain({ data: [{ id: 'd1' }], error: null });
      const result = await disputesService.getAll();
      expect(result).toEqual([{ id: 'd1' }]);
    });

    it('getById returns a dispute', async () => {
      currentChain = createChain({ data: { id: 'd1' }, error: null });
      const result = await disputesService.getById('d1');
      expect(result).toEqual({ id: 'd1' });
    });

    it('create returns new dispute', async () => {
      currentChain = createChain({ data: { id: 'd2' }, error: null });
      const result = await disputesService.create({ transaction_id: 't1' });
      expect(result).toEqual({ id: 'd2' });
    });

    it('updateStatus changes status', async () => {
      currentChain = createChain({ data: { id: 'd1', status: 'resolved' }, error: null });
      const result = await disputesService.updateStatus('d1', 'resolved');
      expect(result).toEqual({ id: 'd1', status: 'resolved' });
    });
  });
});
