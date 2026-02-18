#!/usr/bin/env python3
"""
Simple icon generator for MedTracker PWA
Requires: PIL (pip install Pillow)

This creates basic placeholder icons. For production, use proper graphics software.
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is not installed.")
    print("Install it with: pip install Pillow")
    exit(1)

def create_icon(size, filename):
    """Create a simple medical cross icon"""
    # Create image with teal background
    img = Image.new('RGB', (size, size), color='#0f766e')
    draw = ImageDraw.Draw(img)
    
    # Draw pill shape (rounded rectangle)
    margin = size // 4
    pill_width = size - (margin * 2)
    pill_height = pill_width // 2
    
    # Calculate position to center the pill
    x = margin
    y = (size - pill_height) // 2
    
    # Draw the pill (rounded rectangle)
    draw.rounded_rectangle(
        [x, y, x + pill_width, y + pill_height],
        radius=pill_height // 2,
        fill='white'
    )
    
    # Add a dividing line in the middle
    line_x = size // 2
    line_width = 3
    draw.rectangle(
        [line_x - line_width//2, y, line_x + line_width//2, y + pill_height],
        fill='#0f766e'
    )
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

if __name__ == "__main__":
    print("Generating MedTracker icons...")
    create_icon(192, 'icon-192.png')
    create_icon(512, 'icon-512.png')
    print("Done! Icons created successfully.")
    print("\nYou can now use these icons for your PWA.")
    print("For better looking icons, consider using a graphic design tool.")