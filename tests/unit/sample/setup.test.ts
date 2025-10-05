describe('Test Setup Verification', () => {
  it('should run Jest tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript works!';
    expect(message).toContain('TypeScript');
  });
});
