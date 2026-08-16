import sys
from PIL import Image

def remove_green_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Green screen is roughly high G, lower R and B
        r, g, b, a = item
        if g > 150 and r < 100 and b < 100:
            new_data.append((0, 0, 0, 0)) # Transparent
        elif g > 100 and r < 50 and b < 50:
            new_data.append((0, 0, 0, 0)) # Transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_green_background(
        "/Users/thanojbuddhima/.gemini/antigravity-ide/brain/4bfdbf46-1ff5-4f8b-986a-2f6b7f92397c/.user_uploaded/media_1786915907457.jpg",
        "public/images/robot_solid.png"
    )
